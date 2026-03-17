import nodemailer from "nodemailer";

async function initializeEmail() {
  const testAccount = await nodemailer.createTestAccount();
  console.log(testAccount);
  return testAccount;
}

// const transport = nodemailer.createTransport({
//     host: process.env.SMTP_ENDPOINT,
//     port: 587,
//     secure: false, // upgrade later with STARTTLS
//     auth: {
//       user: process.env.SMTP_USERNAME,
//       pass: process.env.SMTP_PASSWORD,
//     },
//   });

export async function sendEmail(to: string, body: string) {
    const testAccount = await initializeEmail();
    const transport = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
            user: testAccount.user,
            pass: testAccount.pass,
        },
    });
    
    await transport.sendMail({
        from: "krishnamohank974@gmail.com",
        sender: " krishnamohank974@gmail.com",
        to,
        subject: "Hello from Zapify",
        text: body
    })
}