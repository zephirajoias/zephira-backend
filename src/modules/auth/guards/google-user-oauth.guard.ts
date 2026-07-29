import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleUserOAuthGuard extends AuthGuard('google-user') {}
