import nodemailer from 'nodemailer';
import { convert } from 'html-to-text';

export const sendMail = async (
    from,
    to,
    subject,
    mail,
    attachments,
    callback
) => {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    //let testAccount = await nodemailer.createTestAccount();

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: process.env.MAIL_SMTP_SERVER_HOST,
        port: process.env.MAIL_SMTP_SERVER_PORT, //f.e. 587,
        secure: process.env.MAIL_SMTP_SERVER_PORT === '465', // true for 465, false for other ports
        auth: {
            user: process.env.MAIL_SMTP_SERVER_USERNAME,
            pass: process.env.MAIL_SMTP_SERVER_PASSWORD,
        },
    });

    const text = convert(mail, {
        wordwrap: 130,
    });

    try {
        // send mail with defined transport object
        await transporter.sendMail({
            from, // sender address
            to, // list of receivers
            subject, // Subject line
            html: mail, // html body
            text, //Plaintext
            attachments: attachments.map((attachment) => {
                return {
                    path: './config/attachments/' + attachment,
                };
            }),
        });
        callback();
    } catch (error) {
        callback(error);
    } finally {
        transporter.close();
    }
};
