import 'dotenv/config';
import { EnvironmentSchema, UserSchema } from '../schemas';

export const environment = EnvironmentSchema.parse(process.env);
export const exampleUser = UserSchema.parse({ displayName: 'Example User' });
