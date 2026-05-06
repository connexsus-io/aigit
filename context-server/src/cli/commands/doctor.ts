import { buildDoctorReport, DoctorReport } from '../../diagnostics/doctor';
import type { CommandHandler } from './types';

function formatHumanReport(report: DoctorReport): string {
    const lines: string[] = [];
    lines.push('\n🩺 [aigit doctor]');
    lines.push(`   Workspace: ${report.workspacePath}`);
    lines.push(`   Branch: ${report.currentBranch}`);
    lines.push(`   Status: ${report.status}`);
    lines.push(`   Summary: ${report.summary.errors} error(s), ${report.summary.warnings} warning(s)`);
    lines.push('');
    lines.push('Checks:');
    lines.push(`   .aigit: ${report.checks.aigit.dirExists ? 'present' : 'missing'}`);
    lines.push(`   memory.db: ${report.checks.aigit.memoryDbExists ? 'present' : 'missing'}`);
    lines.push(`   ledger: ${report.checks.ledger.exists ? 'present' : 'missing'}${report.checks.ledger.parseable ? '' : ' (not parseable)'}`);
    lines.push(`   hooks missing: ${report.checks.hooks.missing.length > 0 ? report.checks.hooks.missing.join(', ') : 'none'}`);
    lines.push(`   AGENTS block: ${report.checks.agentsRules.status}`);
    lines.push(`   default skills missing: ${report.checks.skills.missing.length > 0 ? report.checks.skills.missing.join(', ') : 'none'}`);
    lines.push(`   ledger quality: ${report.checks.ledger.nullEmbeddings} null embedding(s), ${report.checks.ledger.noisyMemories} noisy memorie(s), ${report.checks.ledger.taskDrift} task drift(s)`);
    lines.push(`   detected AI tools: ${report.checks.agents.detected.length > 0 ? report.checks.agents.detected.join(', ') : 'none'}`);

    if (report.fixesApplied.length > 0) {
        lines.push('');
        lines.push(`Fixes applied: ${report.fixesApplied.join(', ')}`);
    }

    if (report.issues.length > 0) {
        lines.push('');
        lines.push('Issues:');
        for (const issue of report.issues) {
            lines.push(`   [${issue.severity}] ${issue.message}`);
        }
    }

    lines.push('');
    return lines.join('\n');
}

const handler: CommandHandler = async ({ args, workspacePath }) => {
    const json = args.includes('--json');
    const fix = args.includes('--fix');
    const report = await buildDoctorReport(workspacePath, { fix });

    if (json) {
        console.log(JSON.stringify(report, null, 2));
        return;
    }

    console.log(formatHumanReport(report));
};

export default handler;
