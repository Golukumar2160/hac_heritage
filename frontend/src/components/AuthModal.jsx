/**
 * BHARAT-DRISHTI // Modular Auth Re-Export
 * ========================================
 * Points to modular architecture in frontend/src/components/auth/
 * - AuthModal: Modal container shell
 * - LoginForm: Focused official credential authentication + QuickDemoLogins
 * - SignupForm: Multi-tier dynamic statutory registration
 * - QuickDemoLogins: 1-click evaluator test credentials
 */
export { default } from './auth/AuthModal';
export { default as LoginForm } from './auth/LoginForm';
export { default as SignupForm } from './auth/SignupForm';
export { default as QuickDemoLogins, DEMO_CREDENTIALS } from './auth/QuickDemoLogins';
