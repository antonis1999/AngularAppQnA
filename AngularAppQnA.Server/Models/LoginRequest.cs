namespace AngularAppQnA.Server.Models;

public class LoginRequest
{
    public string Email { get; set; } = "";
    public string Pin { get; set; } = "";
    public string Nickname { get; set; } = "";
    public int StoreId { get; set; }
}