namespace AngularAppQnA.Server.DataContracts
{
    public class LoginResponse : BasicResponse
    {
        public bool IsNewUser { get; set; }
        public User User { get; set;  }
    }
}
