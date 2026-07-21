namespace AngularAppQnA.Server.Services
{
    public interface IEmailService
    {
        Task SendResetPinEmailAsync(
            string recipientEmail,
            string recipientName,
            string resetLink);
    }
}