import { compileHydratedContext } from '../hydration';
import { findWorkspaceRoot } from '../../db';
import type { CommandHandler } from './types';

const handler: CommandHandler = async ({ args }) => {
    const workspacePath = findWorkspaceRoot(process.cwd());
    const fullRules = args.includes('--full-rules');
    const activeFile = args.find(arg => arg !== '--full-rules');
    const context = await compileHydratedContext(workspacePath, activeFile, { fullRules });
    console.log(context);
};

export default handler;
