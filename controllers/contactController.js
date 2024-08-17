const { sendEmail } = require("../utils/email");

const handleContactFormSubmission = async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res
      .status(400)
      .json({ success: false, error: "Toate câmpurile sunt obligatorii." });
  }

  if (message.length < 10 || message.length > 500) {
    return res.status(400).json({
      success: false,
      error: "Mesajul tău trebuie să aibă între 10 și 500 de caractere.",
    });
  }

  try {
    const userSubject = "Am primit mesajul tău - Îți mulțumim!";
    const userHtml = `
                      <!DOCTYPE html>
                      <html lang="ro">

                      <head>
                          <meta charset="UTF-8">
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <title>Îți mulțumim pentru mesajul tău</title>
                          <style>
                              body {
                                  font-family: Arial, sans-serif;
                                  background-color: #f4f4f4;
                                  margin: 0;
                                  padding: 0;
                              }

                              .container {
                                  max-width: 600px;
                                  margin: 20px auto;
                                  background-color: #ffffff;
                                  padding: 20px;
                                  border-radius: 8px;
                                  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                              }

                              h1 {
                                  color: #333333;
                                  font-size: 24px;
                                  text-align: center;
                                  margin-bottom: 20px;
                              }

                              p {
                                  color: #666666;
                                  line-height: 1.6;
                                  margin: 0 0 10px;
                              }

                              .footer {
                                  text-align: center;
                                  color: #999999;
                                  font-size: 14px;
                                  margin-top: 20px;
                              }

                              .footer a {
                                  color: #007bff;
                                  text-decoration: none;
                              }
                          </style>
                      </head>

                      <body>
                          <div class="container">
                              <h1>Îți mulțumim, ${name}!</h1>
                              <p>Dragă ${name},</p>
                              <p>Îți mulțumim că ne-ai contactat. Am primit mesajul tău și îți vom răspunde cât mai curând posibil.</p>
                              <p>Cu stimă,<br>Echipa grileinfo.ro</p>
                              <div class="footer">
                                  <p>&copy; 2024 grileinfo.ro. Toate drepturile rezervate.</p>
                              </div>
                          </div>
                      </body>

                      </html>
                            `;

    await sendEmail(email, userSubject, userHtml, process.env.EMAIL_USER)
      .then((info) => {
        console.log("Email sent successfully:", info.response);
      })
      .catch((error) => {
        console.error("Failed to send email after retries:", error);
      });

    const adminSubject = `Nouă trimitere de formular de contact de la ${name}`;
    const adminHtml = `
                        <!DOCTYPE html>
                        <html lang="ro">
                        <head>
                            <meta charset="UTF-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <title>Nouă trimitere de formular de contact</title>
                            <style>
                                body {
                                    font-family: Arial, sans-serif;
                                    background-color: #f4f4f4;
                                    margin: 0;
                                    padding: 0;
                                }

                                .container {
                                    max-width: 600px;
                                    margin: 20px auto;
                                    background-color: #ffffff;
                                    padding: 20px;
                                    border-radius: 8px;
                                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                                }

                                h1 {
                                    color: #333333;
                                    font-size: 24px;
                                    text-align: center;
                                    margin-bottom: 20px;
                                }

                                p {
                                    color: #666666;
                                    line-height: 1.6;
                                    margin: 0 0 10px;
                                }

                                .message-content {
                                    background-color: #dcfce7;
                                    padding: 15px;
                                    border-left: 4px solid #16a34a;
                                    margin: 20px 0;
                                }

                                .footer {
                                    text-align: center;
                                    color: #999999;
                                    font-size: 14px;
                                    margin-top: 20px;
                                }

                                .footer a {
                                    color: #16a34a;
                                    text-decoration: none;
                                }

                                a {
                                    color: #16a34a;
                                    text-decoration: none;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>Nouă trimitere de formular de contact</h1>
                                <p><strong>Nume:</strong> ${name}</p>
                                <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
                                <div class="message-content">
                                    <p><strong>Mesaj:</strong></p>
                                    <p>${message}</p>
                                </div>
                                <p>Puteți răspunde direct la acest email sau să contactați utilizatorul la <a href="mailto:${email}">${email}</a>.</p>
                                <div class="footer">
                                    <p>&copy; 2024 grileinfo.ro. Toate drepturile rezervate.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                                `;

    await sendEmail(process.env.EMAIL_USER, adminSubject, adminHtml, email)
      .then((info) => {
        console.log("Email sent successfully:", info.response);
      })
      .catch((error) => {
        console.error("Failed to send email after retries:", error);
      });

    return res.status(200).json({
      success: true,
      message: "Mesajul tău a fost trimis cu succes.",
    });
  } catch (error) {
    console.error(
      "Eroare la gestionarea trimiterii formularului de contact:",
      error
    );
    return res.status(500).json({
      success: false,
      error:
        "A apărut o eroare în timpul trimiterii mesajului tău. Te rugăm să încerci din nou mai târziu.",
    });
  }
};

module.exports = {
  handleContactFormSubmission,
};
