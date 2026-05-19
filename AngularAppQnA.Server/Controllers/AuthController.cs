using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.Models;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;

namespace AngularAppQnA.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;

    public AuthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("login")]
    public IActionResult Login(LoginRequest request)
    {

        if (
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Pin) ||
            string.IsNullOrWhiteSpace(request.Nickname) ||
            request.StoreId <= 0
        )
        {
            return BadRequest(new
            {
                success = false,
                message = "Συμπλήρωσε όλα τα πεδία."
            });
        }


        string email =
            request.Email.Trim().ToLower();

        string passwordHash =
            CreateSha256(email + request.Pin);

        var user = _context.Users
     .FirstOrDefault(x =>
         x.PasswordSha256 == passwordHash
     );

        if (user != null)
        {
            return Ok(new
            {
                success = true,
                isNewUser = false,
                message = "OK login",

                user = new
                {
                    user.Id,
                    user.Email,
                    user.Nickname,
                    user.StoreId,
                    user.RoleId
                }
            });
        }

        string[] adminEmails =
        {
            "admin@masoutis.gr" 
            //passwrod:1234
        };

        int roleId =
            adminEmails.Contains(email)
            ? 99
            : 1;

        User newUser = new User
        {
            Email = email,
            PasswordSha256 = passwordHash,
            Nickname = request.Nickname.Trim(),
            StoreId = request.StoreId,
            RoleId = roleId,
            CreatedAt = DateTime.Now
        };

        _context.Users.Add(newUser);

        _context.SaveChanges();

        return Ok(new
        {
            success = true,
            isNewUser = true,
            message = "OK register",

            user = new
            {
                newUser.Id,
                newUser.Email,
                newUser.Nickname,
                newUser.StoreId,
                newUser.RoleId
            }
        });
    }

    private static string CreateSha256(string value)
    {
        byte[] bytes =
            SHA256.HashData(
                Encoding.UTF8.GetBytes(value)
            );

        return Convert
            .ToHexString(bytes)
            .ToLower();
    }
}