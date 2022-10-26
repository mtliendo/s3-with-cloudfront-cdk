#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from 'aws-cdk-lib'
import { AuthStack } from '../lib/authStack'
import { FileStorageStack } from '../lib/filestorageStack'

const app = new cdk.App()

const authStack = new AuthStack(app, 'authStack', {
	identitypoolName: 's3WithCloudfrontIdentitypool',
	userpoolName: 's3WithCloudfrontUserpool',
})

const filestorageStack = new FileStorageStack(app, 'filestorageStack', {
	authenticatedRole: authStack.authenticatedRole,
	unauthenticatedRole: authStack.unauthenticatedRole,
	allowedOrigins: ['http://localhost:3000'],
})
