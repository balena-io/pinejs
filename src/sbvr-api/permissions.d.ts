import * as Promise from 'bluebird'
import * as sbvrUtils from './sbvr-utils'

export const root: sbvrUtils.User
export const rootRead: sbvrUtils.User

export function getUserPermissions(userId: number, callback?: (err: Error | undefined, permissions: string[]) => void): Promise<string[]>;
