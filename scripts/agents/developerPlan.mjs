export function developerPlan(revision) {
  const task = (id, role, access, dependsOn) => ({ id, role, access, dependsOn, authorized: access === 'write', resources: ['*'], status: 'pending', attempts: 0, maxAttempts: 2, required: true });
  return {
    mode: 'development', revision, stepsUsed: 0, maxSteps: 10, maxParallel: 3,
    tasks: [
      task('analyze', 'analysis', 'read', []),
      task('implement', 'implementation', 'write', ['analyze']),
      task('code_review', 'code_review', 'read', ['implement']),
      task('security_review', 'security_review', 'read', ['implement']),
      task('verify', 'verification', 'read', ['code_review', 'security_review']),
    ], checks: {}, review: null,
  };
}
