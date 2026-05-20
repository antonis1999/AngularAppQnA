using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.DataContracts;
using AngularAppQnA.Server.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
    public async Task<LoginResponse> Login(LoginRequest request)
    {
        LoginResponse ret = new LoginResponse();
        if (
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Pin) ||
            string.IsNullOrWhiteSpace(request.Nickname) ||
            request.StoreId <= 0
        )
        {
            ret.IsSuccess = false;
            ret.Message = "Invalid input data";
            return ret;
        }

        request.Email = request.Email.Trim().ToLower();

        User userFound = await _context.Users.Where(x => x.Email == request.Email).FirstOrDefaultAsync();

        if (userFound != null)
        {
            string passwordHash = CreateSha256(request.Email + request.Pin);
            if (string.IsNullOrWhiteSpace(userFound.PasswordSha256))
            {
                userFound.PasswordSha256 = passwordHash;
                userFound.Nickname = request.Nickname.Trim();
                _context.Users.Update(userFound);
                _context.SaveChangesAsync();

                ret.IsSuccess = true;
                ret.Message = "OK login";
                ret.User = userFound;
                return ret;
            }
            else
            {
                if (userFound.PasswordSha256 == passwordHash)
                {
                    ret.IsSuccess = true;
                    ret.Message = "OK login";
                    ret.User = userFound;
                    return ret;
                }
                else
                {
                    ret.IsSuccess = false;
                    ret.Message = "Invalid password";
                    return ret;
                }
            }
        }
        else
        {
            ret.IsSuccess = false;
            ret.Message = "User not found";
            return ret;
        }

        /*
        string email = request.Email.Trim().ToLower();

        string passwordHash = CreateSha256(email + request.Pin);

        var user = _context.Users.FirstOrDefault(x =>
         x.PasswordSha256 == passwordHash);

        if (user != null)
        {
            returnContract.IsSuccess = true;
            returnContract.IsNewUser = false;
            returnContract.Message = "OK login";
            return returnContract;
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
        */
        return new LoginResponse
        {
            IsSuccess = true,
            Message = "OK register",
            IsNewUser = true,
            User = new User()
        };

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