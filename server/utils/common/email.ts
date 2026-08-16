import nodemailer from "nodemailer";

// Mail + app settings come from runtimeConfig (NUXT_MAIL_* / NUXT_APP_* env vars)
function getEmailConfig() {
  const config = useRuntimeConfig();
  return {
    from: (config.mailFrom as string) || "noreply@example.com",
    appName: (config.appName as string) || "Nuxt App",
    appUrl: (config.appUrl as string) || "http://localhost:3000",
  };
}

// Create nodemailer transporter
function createTransporter() {
  const config = useRuntimeConfig();

  return nodemailer.createTransport({
    host: config.mailHost,
    port: parseInt(config.mailPort as string),
    secure: config.mailSecure, // true for 465, false for other ports
    auth: {
      user: config.mailUsername,
      pass: config.mailPassword,
    },
    tls: {
      rejectUnauthorized: false, // For development - remove in production
    },
  });
}

export async function sendVerificationEmail(email: string, token: string) {
  const { appName, appUrl, from } = getEmailConfig();
  const verificationUrl = `${appUrl}/verify-email?token=${token}`;

  // Render the email template using nuxt-email-renderer
  // @ts-ignore: $render is auto-imported by nuxt-email-renderer
  const html = await renderEmailComponent("EmailVerification", {
    appName,
    verificationUrl,
  });

  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to: email,
    subject: `Verify your email address - ${appName}`,
    html: html as string, // Use the rendered HTML content
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const { appName, appUrl, from } = getEmailConfig();
  const resetUrl = `${appUrl}/reset-password?token=${token}`;

  // Render the email template using nuxt-email-renderer
  // @ts-ignore: $render is auto-imported by nuxt-email-renderer
  const html = await renderEmailComponent("PasswordReset", {
    appName,
    resetUrl,
  });

  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to: email,
    subject: `Reset your password - ${appName}`,
    html: html as string, // Use the rendered HTML content
  });
}

export async function sendWelcomeEmail(email: string, firstName: string) {
  const { appName, appUrl, from } = getEmailConfig();
  const loginUrl = `${appUrl}/login`;

  // Render the email template using nuxt-email-renderer
  // @ts-ignore: $render is auto-imported by nuxt-email-renderer
  const html = await renderEmailComponent("Welcome", {
    appName,
    firstName,
    loginUrl,
  });

  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to: email,
    subject: `Welcome to ${appName}!`,
    html: html as string, // Use the rendered HTML content
  });
}

export async function sendAccountDeactivationEmail(
  email: string,
  firstName: string,
) {
  const { appName, from } = getEmailConfig();

  // Render the email template using nuxt-email-renderer
  // @ts-ignore: $render is auto-imported by nuxt-email-renderer
  const html = await renderEmailComponent("AccountDeactivation", {
    appName,
    firstName,
  });

  const transporter = createTransporter();

  await transporter.sendMail({
    from,
    to: email,
    subject: `Account Deactivated - ${appName}`,
    html: html as string, // Use the rendered HTML content
  });
}
