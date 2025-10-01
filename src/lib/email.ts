import nodemailer from 'nodemailer';

// Create transporter with Outlook configuration
const transporter = nodemailer.createTransport({
  host: 'smtp-mail.outlook.com', // Outlook SMTP server
  port: 587, // Outlook uses port 587 for TLS
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Your Outlook password
  },
  tls: {
    ciphers: 'SSLv3', // Use SSLv3 for Outlook compatibility
    rejectUnauthorized: false // Allow self-signed certificates
  }
});

// Alternative configuration for modern Outlook accounts
const createOutlookTransporter = () => {
  return nodemailer.createTransport({
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

export async function sendAdminCredentials(email: string, name: string, password: string, isRoleChange = false) {
  const subject = isRoleChange 
    ? 'Your Role Has Been Changed - Project Showcase'
    : 'Admin Account Created - for sona It project showcase';
  
  const bodyIntro = isRoleChange
    ? `<p>Your account role has been changed to <strong>Admin</strong>.</p>`
    : `<p>Your admin account has been created successfully. Here are your login credentials:</p>`;
  
  const credentialsSection = isRoleChange
    ? `<p>You can now access the admin panel using your existing credentials.</p>`
    : `
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">Login Credentials</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> <code style="background-color: #e9ecef; padding: 8px 12px; border-radius: 5px; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${password}</code></p>
      </div>
      <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
    `;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Project Showcase page of sona It</h2>
        <p>Hello ${name},</p>
        ${bodyIntro}
        ${credentialsSection}
        <p>You can access the admin panel at: <a href="${process.env.NEXTAUTH_URL}/admin/login">${process.env.NEXTAUTH_URL}/admin/login</a></p>
        <p>Best regards,<br>Project Showcase Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending email with primary transporter:', error);
    // Try with alternative transporter
    try {
      const altTransporter = createOutlookTransporter();
      await altTransporter.sendMail(mailOptions);
      return { success: true };
    } catch (altError) {
      console.error('Error sending email with alternative transporter:', altError);
      return { success: false, error: altError instanceof Error ? altError.message : 'Unknown error' };
    }
  }
}

export async function sendOTP(email: string, otp: string) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset OTP - Project Showcase',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You have requested to reset your password. Use the following OTP to proceed:</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
        </div>
        
        <p><strong>Note:</strong> This OTP is valid for 10 minutes. If you didn't request this, please ignore this email.</p>
        
        <p>Best regards,<br>Project Showcase Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending OTP email with primary transporter:', error);
    // Try with alternative transporter
    try {
      const altTransporter = createOutlookTransporter();
      await altTransporter.sendMail(mailOptions);
      return { success: true };
    } catch (altError) {
      console.error('Error sending OTP email with alternative transporter:', altError);
      return { success: false, error: altError instanceof Error ? altError.message : 'Unknown error' };
    }
  }
}

export async function sendContributorCredentials(email: string, name: string, password: string, isRoleChange = false) {
  const subject = isRoleChange
    ? 'Your Role Has Been Changed - Project Showcase'
    : 'Your Contributor Account - Project Showcase';
  
  const bodyIntro = isRoleChange
    ? `<p>Your account role has been changed to <strong>Contributor</strong>.</p>`
    : `<p>Your contributor account has been created. Use the following credentials to log in:</p>`;
  
  const credentialsSection = isRoleChange
    ? `<p>You can now access the contributor dashboard using your existing credentials.</p>`
    : `
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> <code style="background-color: #e9ecef; padding: 8px 12px; border-radius: 5px; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${password}</code></p>
      </div>
      <p style="margin-top:16px"><strong>Important:</strong> Please change your password after first login.</p>
    `;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Project Showcase</h2>
        <p>Hello ${name || email},</p>
        ${bodyIntro}
        ${credentialsSection}
        <p>You can access the contributor dashboard at: <a href="${process.env.NEXTAUTH_URL}/contributor/login">${process.env.NEXTAUTH_URL}/contributor/login</a></p>
        <p>Best regards,<br/>Project Showcase Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    try {
      const altTransporter = createOutlookTransporter();
      await altTransporter.sendMail(mailOptions);
      return { success: true };
    } catch (altError) {
      return { success: false, error: altError instanceof Error ? altError.message : 'Unknown error' };
    }
  }
}

export async function sendDualRoleCredentials(email: string, name: string, password: string, isRoleChange = false) {
  const subject = isRoleChange
    ? 'Your Role Has Been Changed - Project Showcase'
    : 'Your Admin + Contributor Account - Project Showcase';
  
  const bodyIntro = isRoleChange
    ? `<p>Your account role has been changed to <strong>Both Admin and Contributor</strong>.</p>`
    : `<p>Your account has been created with <strong>both Admin and Contributor</strong> privileges. Use the following credentials to log in:</p>`;
  
  const credentialsSection = isRoleChange
    ? `<p>You can now access both panels using your existing credentials.</p>`
    : `
      <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">Login Credentials</h3>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Password:</strong> <code style="background-color: #e9ecef; padding: 8px 12px; border-radius: 5px; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${password}</code></p>
      </div>
      <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
    `;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Project Showcase</h2>
        <p>Hello ${name},</p>
        ${bodyIntro}
        ${credentialsSection}
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin-top: 0;">You have access to:</h3>
          <ul style="margin: 10px 0;">
            <li><strong>Admin Panel:</strong> <a href="${process.env.NEXTAUTH_URL}/admin/login">${process.env.NEXTAUTH_URL}/admin/login</a></li>
            <li><strong>Contributor Dashboard:</strong> <a href="${process.env.NEXTAUTH_URL}/contributor/login">${process.env.NEXTAUTH_URL}/contributor/login</a></li>
          </ul>
        </div>
        <p>Best regards,<br>Project Showcase Team</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error('Error sending dual role email with primary transporter:', error);
    try {
      const altTransporter = createOutlookTransporter();
      await altTransporter.sendMail(mailOptions);
      return { success: true };
    } catch (altError) {
      console.error('Error sending dual role email with alternative transporter:', altError);
      return { success: false, error: altError instanceof Error ? altError.message : 'Unknown error' };
    }
  }
}
