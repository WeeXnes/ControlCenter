import {IUser} from "~/server/models/db_models";


const ROLE_PRIORITY: Record<string, number> = {
    Owner: 10,
    Moderator: 5,
    Developer: 3,
    User: 1,
};


const hasPermission = async (user: IUser, requiredPermission: number): Promise<boolean> => {
    if (!user.roles || user.roles.length === 0) return false;
    const highestRoleValue = user.roles.reduce((max, role) => {
        const value = ROLE_PRIORITY[role] ?? 0;
        return Math.max(max, value);
    }, 0);
    return highestRoleValue >= requiredPermission;
};

export { hasPermission };