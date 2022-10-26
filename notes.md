## application overview

I want to build a photo sharing app where users can:

- upload photos
- uploaded photos can be designated to be a draft or public
- draft photos are protected by the logged in user
- public photos are viewable by anyone

## init

Things I need on backend

- s3 bucket
- cloudfront
- Cognito user pool
- Cognito indentity pool
  - `npm i @aws-cdk/aws-cognito-identitypool-alpha`

Things I need on frontend

- NextJS Image
- dataObjectURL for blurred images (placeit package?)
- Amplify JavaScript libraries (Storage component)
- Amplify UI libraries

## resources/learnings

- I reverse engineered [this cloudformation](https://s3-eu-west-1.amazonaws.com/tomash-public/AWS/s3bucket_with_cloudfront.yml) template to figure out what I needed from an CloudFront + S3 perspective

## learnings

The `Distribution` construct will allow `GET` access to the root of the bucket. In my case, I only want to grant access to the `/public` bucket. Fortunately, the construct comes with a handy parameter you can pass as behavior:

```ts
origin: new S3Origin(fileStorageBucket, { originPath: '/public' })
```

Now, if my CDN URL gets a request like 'https://domainName.cloudfront.net/mypic.png',
it will to my bucket as 'https://mybucketname.us-east-1.s3.amazon.aw.com/public/mypic.png`.

So there's never a way to get to `/protected` and `/private` directories 😎
