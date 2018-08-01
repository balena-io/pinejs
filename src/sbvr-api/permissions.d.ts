import * as Promise from 'bluebird'

export function getUserPermissions(userId: number, callback?: (err: Error | undefined, permissions: string[]) => void): Promise<string[]>;
