import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const { DEV_GMAIL_USER, DEV_GMAIL_PASSWORD } = process.env;
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: DEV_GMAIL_USER,
    pass: DEV_GMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export const sendmail = async (to: string, subject: string, html: string) => {
  try {
    const reponse = await transporter.sendMail({
      from: process.env.DEV_GMAIL_USER,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.log(err);
  }
};

export const notifications_for_new_products = () => {
  const mail = `
                    <div style = "text-align:center">
                    <p style = "color:green; font-size: 30px; font-weight:bold">Shopify store</p>
                    <p style = "color:green; font-size: 24px">New Products Imported!!!</p>
                    <p style = "color:black; font-size: 16px">Product import has been completed. Please check your store to see new imported products.</p>
                    <div style = "padding-top: 10px; text-align:center">
                    <p style = "font-size: 14px">Shopify store, <br/>Shopify store.</p>
                    </div>
                    </div>
                    `;

  return mail;
};

export const notifications_for_no_new_products = () => {
  const mail = `
                    <div style = "text-align:center">
                    <p style = "color:green; font-size: 30px; font-weight:bold">Shopify store</p>
                    <p style = "color:red; font-size: 24px">No New Products Imported!!!</p>
                    <p style = "color:black; font-size: 16px">Product import has been completed and no new products was found.</p>
                    <div style = "padding-top: 10px; text-align:center">
                    <p style = "font-size: 14px">Shopify store, <br/>Shopify store.</p>
                    </div>
                    </div>
                    `;

  return mail;
};

export const notifications_for_failed_import = () => {
  const mail = `
                    <div style = "text-align:center">
                    <p style = "color:green; font-size: 30px; font-weight:bold">Shopify store</p>
                    <p style = "color:red; font-size: 24px">Product Import FAILED!!!</p>
                    <p style = "color:red; font-size: 16px">Sorry, we noticed an error occured when trying to import products to your store. Please try again later.</p>
                    <div style = "padding-top: 10px; text-align:center">
                    <p style = "font-size: 14px">Shopify store, <br/>Shopify store.</p>
                    </div>
                    </div>
                    `;

  return mail;
};
