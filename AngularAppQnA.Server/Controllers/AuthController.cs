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

        User? userFound = await _context.Users
            .FirstOrDefaultAsync(x => x.Email == request.Email);

        if (userFound == null)
        {
            ret.IsSuccess = false;
            ret.Message = "User not found";
            return ret;
        }

        string passwordHash = CreateSha256(request.Email + request.Pin);

        if (string.IsNullOrWhiteSpace(userFound.PasswordSha256))
        {
            string nickname = request.Nickname.Trim();

            bool nicknameExists = await _context.Users
                .AnyAsync(x =>
                    x.Nickname.ToLower() == nickname.ToLower()
                    && x.Email != request.Email
                );

            if (nicknameExists)
            {
                ret.IsSuccess = false;
                ret.Message = "Το nickname χρησιμοποιείται ήδη";
                return ret;
            }

            userFound.PasswordSha256 = passwordHash;
            userFound.Nickname = nickname;

            _context.Users.Update(userFound);
            await _context.SaveChangesAsync();

            ret.IsSuccess = true;
            ret.Message = "OK login";
            ret.User = userFound;
            return ret;
        }

        if (userFound.PasswordSha256 == passwordHash)
        {
            ret.IsSuccess = true;
            ret.Message = "OK login";
            ret.User = userFound;
            return ret;
        }

        ret.IsSuccess = false;
        ret.Message = "Invalid password";
        return ret;
    }

    private static string CreateSha256(string value)
    {
        byte[] bytes = SHA256.HashData(
            Encoding.UTF8.GetBytes(value)
        );

        return Convert
            .ToHexString(bytes)
            .ToLower();
    }
}