import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as iam from 'aws-cdk-lib/aws-iam'
import {
	AllowedMethods,
	CachePolicy,
	Distribution,
	ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront'
import { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins'

interface FileStorageStackProps extends StackProps {
	authenticatedRole: iam.IRole
	unauthenticatedRole: iam.IRole
	allowedOrigins: string[]
}

export class FileStorageStack extends Stack {
	constructor(scope: Construct, id: string, props: FileStorageStackProps) {
		super(scope, id, props)

		const fileStorageBucket = new s3.Bucket(this, 's3-bucket', {
			removalPolicy: RemovalPolicy.DESTROY,
			autoDeleteObjects: true,
			cors: [
				{
					allowedMethods: [
						s3.HttpMethods.GET,
						s3.HttpMethods.POST,
						s3.HttpMethods.PUT,
						s3.HttpMethods.DELETE,
					],
					allowedOrigins: props.allowedOrigins,
					allowedHeaders: ['*'],
				},
			],
		})

		const imagesCFDistribution = new Distribution(this, 'myDist', {
			defaultBehavior: {
				origin: new S3Origin(fileStorageBucket, { originPath: '/public' }),
				cachePolicy: CachePolicy.CACHING_OPTIMIZED,
				allowedMethods: AllowedMethods.ALLOW_GET_HEAD,
				cachedMethods: AllowedMethods.ALLOW_GET_HEAD,
				viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
			},
		})

		// * If NOT using cloudfront, this would allow GUEST access to the public directory (urls would still be signed)
		// fileStorageBucket.addToResourcePolicy(
		// 	new iam.PolicyStatement({
		// 		effect: iam.Effect.ALLOW,
		// 		actions: ['s3:GetObject'],
		// 		principals: [new iam.AnyPrincipal()],
		// 		resources: [`arn:aws:s3:::${fileStorageBucket.bucketName}/public/*`],
		// 	})
		// )

		const getAnyFileFromPublicPath = new iam.PolicyStatement({
			effect: iam.Effect.ALLOW,
			actions: ['s3:GetObject'],
			resources: [`arn:aws:s3:::${fileStorageBucket.bucketName}/public/*`],
		})

		const getAnyFileFromProtectedPath = new iam.PolicyStatement({
			effect: iam.Effect.ALLOW,
			actions: ['s3:GetObject'],
			resources: [`arn:aws:s3:::${fileStorageBucket.bucketName}/protected/*`],
		})

		const performCRUDonAnyPublicFile = new iam.PolicyStatement({
			effect: iam.Effect.ALLOW,
			actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
			resources: [`arn:aws:s3:::${fileStorageBucket.bucketName}/public/*`],
		})

		const performCRUDonAnyProtectedFileThatIsTheirs = new iam.PolicyStatement({
			effect: iam.Effect.ALLOW,
			actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
			resources: [
				`arn:aws:s3:::${fileStorageBucket.bucketName}/protected/\${cognito-identity.amazonaws.com:sub}/*`,
			],
		})

		const performCRUDonAnyPrivateFileThatIsTheirs = new iam.PolicyStatement({
			effect: iam.Effect.ALLOW,
			actions: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject'],
			resources: [
				`arn:aws:s3:::${fileStorageBucket.bucketName}/private/\${cognito-identity.amazonaws.com:sub}/*`,
			],
		})

		const getAnyProtectedFileThatIsNotTheirs = new iam.PolicyStatement({
			effect: iam.Effect.ALLOW,
			actions: ['s3:GetObject'],
			resources: [`arn:aws:s3:::${fileStorageBucket.bucketName}/protected/*`],
		})

		const listAllFilesFromAnyOfThesePrefixedPaths = new iam.PolicyStatement({
			effect: iam.Effect.ALLOW,
			actions: ['s3:ListBucket'],
			resources: [`arn:aws:s3:::${fileStorageBucket.bucketName}`],
			conditions: {
				StringLike: {
					's3:prefix': [
						'public/',
						'public/*',
						'protected/',
						'protected/*',
						'private/${cognito-identity.amazonaws.com:sub}/',
						'private/${cognito-identity.amazonaws.com:sub}/*',
					],
				},
			},
		})

		const mangedPolicyForAmplifyUnauth = new iam.ManagedPolicy(
			this,
			'mangedPolicyForAmplifyUnauth',
			{
				description: 'Managed policy that dictates what guest users can do.',
				statements: [getAnyFileFromPublicPath, getAnyFileFromProtectedPath],
				roles: [props.unauthenticatedRole],
			}
		)

		const mangedPolicyForAmplifyAuth = new iam.ManagedPolicy(
			this,
			'mangedPolicyForAmplifyAuth',
			{
				description: 'Managed policy that dictates what auth users can do.',
				statements: [
					performCRUDonAnyPublicFile,
					performCRUDonAnyProtectedFileThatIsTheirs,
					performCRUDonAnyPrivateFileThatIsTheirs,
					getAnyProtectedFileThatIsNotTheirs,
					listAllFilesFromAnyOfThesePrefixedPaths,
				],
				roles: [props.authenticatedRole],
			}
		)

		new CfnOutput(this, 'BucketName', {
			value: fileStorageBucket.bucketName,
		})

		new CfnOutput(this, 'BucketRegion', {
			value: this.region,
		})

		new CfnOutput(this, 'Cloudfront dist domain name', {
			value: imagesCFDistribution.distributionDomainName,
		})
		new CfnOutput(this, 'Cloudfront distribution ID', {
			value: imagesCFDistribution.distributionId,
		})
	}
}
