namespace AngularAppQnA.Server.Models
{
    public class ResetPinRequest
    {
        public Guid Token { get; set; }

        public string NewPin { get; set; } = "";

        public string ConfirmPin { get; set; } = "";
    }
}