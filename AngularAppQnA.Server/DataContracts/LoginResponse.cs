namespace AngularAppQnA.Server.DataContracts
{
    public class LoginResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = "";
        public bool IsNewUser { get; set; }
        public string Token { get; set; } = "";
        public msc_Users? User { get; set; }
    }
}
