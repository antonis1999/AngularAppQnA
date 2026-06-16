namespace AngularAppQnA.Server.DataContract
{
    public class ChangeUserPinRequest
    {
        public int UserId { get; set; }
        public string Pin { get; set; } = string.Empty;
    }
}