using AngularAppQnA.Server.Settings;
using Microsoft.Extensions.Options;
using System.Net;
using System.Net.Mail;
using System.Text;

namespace AngularAppQnA.Server.Services
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;

        public EmailService(
            IOptions<EmailSettings> emailSettings)
        {
            _emailSettings = emailSettings.Value;
        }

        public async Task SendResetPinEmailAsync(
            string recipientEmail,
            string recipientName,
            string resetLink)
        {
            using var smtpClient = new SmtpClient(
                _emailSettings.SmtpServer,
                _emailSettings.Port);

            smtpClient.EnableSsl =
                _emailSettings.EnableSsl;

            smtpClient.DeliveryMethod =
                SmtpDeliveryMethod.Network;

            smtpClient.UseDefaultCredentials = false;

            smtpClient.Credentials =
                new NetworkCredential(
                    _emailSettings.Username,
                    _emailSettings.Password);

            using var message = new MailMessage();

            message.From = new MailAddress(
                _emailSettings.SenderEmail,
                _emailSettings.SenderName,
                Encoding.UTF8);

            message.To.Add(recipientEmail);
            //message.CC.Add("alomtzianidis@masoutis.gr");

            message.Subject =
                "Επαναφορά PIN - Masoutis Safety Campaign";

            message.SubjectEncoding = Encoding.UTF8;
            message.BodyEncoding = Encoding.UTF8;
            message.IsBodyHtml = true;

            string displayName =
                string.IsNullOrWhiteSpace(recipientName)
                    ? "χρήστη"
                    : WebUtility.HtmlEncode(recipientName);

            string encodedResetLink =
                WebUtility.HtmlEncode(resetLink);

            string htmlBody = $"""
                <html lang="el">
                    <body style="
                        margin:0;
                        padding:0;
                        background-color:#f1f4f8;
                        font-family:Arial,Helvetica,sans-serif;
                    ">

                        <div style="
                            max-width:600px;
                            margin:40px auto;
                            background:#ffffff;
                            border-radius:18px;
                            overflow:hidden;
                            box-shadow:0 14px 40px rgba(15,23,42,0.14);
                        ">

                            <div style="
                                padding:28px;
                                background:#172b4d;
                                text-align:center;
                            ">

                                <div style="
                                    color:#f5c542;
                                    font-size:26px;
                                    font-weight:800;
                                ">
                                    Μασούτης
                                </div>

                                <div style="
                                    margin-top:7px;
                                    color:#ffffff;
                                    font-size:12px;
                                    letter-spacing:2px;
                                ">
                                    SAFETY CAMPAIGN
                                </div>

                            </div>

                            <div style="padding:36px 32px;">

                                <h2 style="
                                    margin:0 0 20px;
                                    color:#172033;
                                    font-size:25px;
                                ">
                                    Επαναφορά PIN
                                </h2>

                                <p style="
                                    color:#4b5563;
                                    font-size:15px;
                                    line-height:1.7;
                                ">
                                    Γεια σου {displayName},
                                </p>

                                <p style="
                                    color:#4b5563;
                                    font-size:15px;
                                    line-height:1.7;
                                ">
                                    Λάβαμε αίτημα για αλλαγή του PIN
                                    του λογαριασμού σου.
                                </p>

                                <p style="
                                    color:#4b5563;
                                    font-size:15px;
                                    line-height:1.7;
                                ">
                                    Πάτησε το παρακάτω κουμπί για να
                                    δημιουργήσεις ένα νέο PIN.
                                </p>

                                <div style="
                                    padding:22px 0 30px;
                                    text-align:center;
                                ">

                                    <a
                                        href="{encodedResetLink}"
                                        style="
                                            display:inline-block;
                                            padding:15px 28px;
                                            background:#f3be2d;
                                            color:#172033;
                                            text-decoration:none;
                                            border-radius:11px;
                                            font-size:15px;
                                            font-weight:800;
                                        ">

                                        Δημιουργία νέου PIN

                                    </a>

                                </div>

                                <p style="
                                    margin:0 0 12px;
                                    color:#6b7280;
                                    font-size:13px;
                                    line-height:1.6;
                                ">
                                    Ο σύνδεσμος ισχύει για 30 λεπτά
                                    και μπορεί να χρησιμοποιηθεί μόνο μία φορά.
                                </p>

                                <p style="
                                    margin:0;
                                    color:#6b7280;
                                    font-size:13px;
                                    line-height:1.6;
                                ">
                                    Αν δεν ζήτησες αλλαγή PIN,
                                    αγνόησε αυτό το email.
                                </p>

                            </div>

                            <div style="
                                padding:20px;
                                background:#f8fafc;
                                color:#94a3b8;
                                text-align:center;
                                font-size:12px;
                            ">
                                ΔΙΑΜΑΝΤΗΣ ΜΑΣΟΥΤΗΣ Α.Ε.
                            </div>

                        </div>

                    </body>
                </html>
                """;

            var textView =
                AlternateView.CreateAlternateViewFromString(
                    $"Για να αλλάξεις το PIN σου, άνοιξε τον σύνδεσμο: {resetLink}",
                    null,
                    "text/plain");

            var htmlView =
                AlternateView.CreateAlternateViewFromString(
                    htmlBody,
                    null,
                    "text/html");

            message.AlternateViews.Add(textView);
            message.AlternateViews.Add(htmlView);

            await smtpClient.SendMailAsync(message);
        }
    }
}