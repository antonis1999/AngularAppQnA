using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.DataContract;
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
    [HttpGet("GetUsers")]
    public IActionResult GetUsers()
    {
        var users = _context.Users
            .Select(x => new
            {
                x.Id,
                x.Email,
                x.Nickname,
                x.StoreId,
                x.RoleId,
                x.CreatedAt
            })
            .ToList();

        return Ok(users);
    }
    [HttpPost("ChangeUserPin")]
    public async Task<IActionResult> ChangeUserPin([FromBody] ChangeUserPinRequest request)
    {
        try
        {
            if (request.UserId <= 0)
            {
                return BadRequest(new
                {
                    IsSuccess = false,
                    Message = "Δεν επιλέχθηκε χρήστης."
                });
            }

            if (string.IsNullOrWhiteSpace(request.Pin))
            {
                return BadRequest(new
                {
                    IsSuccess = false,
                    Message = "Το PIN είναι υποχρεωτικό."
                });
            }

            if (request.Pin.Length < 4 || !request.Pin.All(char.IsDigit))
            {
                return BadRequest(new
                {
                    IsSuccess = false,
                    Message = "Το PIN πρέπει να έχει τουλάχιστον 4 ψηφία."
                });
            }

            var user = await _context.Users
                .FirstOrDefaultAsync(x => x.Id == request.UserId);

            if (user == null)
            {
                return NotFound(new
                {
                    IsSuccess = false,
                    Message = "Ο χρήστης δεν βρέθηκε."
                });
            }

            using var sha256 = System.Security.Cryptography.SHA256.Create();

            var newValue = user.Email + request.Pin;
            var bytes = System.Text.Encoding.UTF8.GetBytes(newValue);
            var hashBytes = sha256.ComputeHash(bytes);

            user.PasswordSha256 = Convert.ToHexString(hashBytes).ToLower();

            await _context.SaveChangesAsync();

            return Ok(new
            {
                IsSuccess = true,
                Message = "Το PIN άλλαξε επιτυχώς."
            });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                IsSuccess = false,
                Message = ex.Message
            });
        }
    }
}