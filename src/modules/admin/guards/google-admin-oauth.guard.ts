import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAdminOAuthGuard extends AuthGuard('google-admin') {}
