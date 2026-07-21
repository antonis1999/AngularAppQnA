using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.DataContract;
using AngularAppQnA.Server.DataContracts;
using AngularAppQnA.Server.Models;
using AngularAppQnA.Server.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace AngularAppQnA.Server.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;

    public AuthController(AppDbContext context, IConfiguration configuration, IEmailService emailService)
    {
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
    }

    [HttpPost("login")]
    public async Task<LoginResponse> Login(LoginRequest request)
    {
        LoginResponse ret = new LoginResponse();

        if (
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.Pin)
        )
        {
            ret.IsSuccess = false;
            ret.Message = "Συμπλήρωσε email και PIN";
            return ret;
        }

        if (
            request.IsFirstLogin &&
            (string.IsNullOrWhiteSpace(request.Nickname) || request.StoreId <= 0)
        )
        {
            ret.IsSuccess = false;
            ret.Message = "Συμπλήρωσε nickname και χώρο εργασίας";
            return ret;
        }

        request.Email = request.Email.Trim().ToLower();

        msc_Users? userFound = await _context.msc_Users
            .FirstOrDefaultAsync(x => x.Email == request.Email);

        if (userFound == null)
        {
            ret.IsSuccess = false;
            ret.Message = "User not found";
            return ret;
        }
        if (!userFound.IsActive)
        {
            ret.IsSuccess = false;
            ret.Message = "Ο λογαριασμός σας είναι ανενεργός. Επικοινωνήστε με τον διαχειριστή.";
            return ret;
        }

        bool hasPassword = !string.IsNullOrWhiteSpace(userFound.PasswordSha256);

        if (request.IsFirstLogin && hasPassword)
        {
            ret.IsSuccess = false;
            ret.Message = "Έχεις ήδη ολοκληρώσει την πρώτη σύνδεση.  Πάτησε Όχι στην ερώτηση «Συνδέεσαι πρώτη φορά;» και συνδέσου μόνο με email και PIN.";
            return ret;
        }

        if (!request.IsFirstLogin && !hasPassword)
        {
            ret.IsSuccess = false;
            ret.Message = "Φαίνεται ότι συνδέεσαι πρώτη φορά. Πάτησε Ναι στην ερώτηση «Συνδέεσαι πρώτη φορά;» και συμπλήρωσε nickname και χώρο εργασίας.";
            return ret;
        }

        string passwordHash = CreateSha256(request.Email + request.Pin);

        if (string.IsNullOrWhiteSpace(userFound.PasswordSha256))
        {
            if (!request.IsFirstLogin)
            {
                ret.IsSuccess = false;
                ret.Message = "Επίλεξε 'Ναι' στην πρώτη σύνδεση για να δημιουργήσεις PIN.";
                return ret;
            }

            string nickname = request.Nickname.Trim();

            bool nicknameExists = await _context.msc_Users
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
            userFound.StoreId = request.StoreId;

            _context.msc_Users.Update(userFound);
            await _context.SaveChangesAsync();

            ret.IsSuccess = true;
            ret.Message = "OK login";
            ret.User = userFound;
            ret.Token = CreateJwtToken(userFound);
            return ret;
        }

        if (userFound.PasswordSha256 == passwordHash)
        {
            ret.IsSuccess = true;
            ret.Message = "OK login";
            ret.User = userFound;
            ret.Token = CreateJwtToken(userFound);
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
        var users = _context.msc_Users
            .Select(x => new
            {
                x.Id,
                x.Email,
                x.Nickname,
                x.StoreId,
                x.RoleId,
                x.IsActive,
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

            var user = await _context.msc_Users
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
    private string CreateJwtToken(msc_Users user)
    {
        var claims = new List<Claim>
    {
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Email, user.Email ?? ""),
        new Claim(ClaimTypes.Name, user.Nickname ?? ""),
        new Claim(ClaimTypes.Role, user.RoleId.ToString())
    };
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!)
        );

        var credentials = new SigningCredentials(
            key,
            SecurityAlgorithms.HmacSha256
        );

        var token = new JwtSecurityToken(
                 issuer: _configuration["Jwt:Issuer"],
                 audience: _configuration["Jwt:Audience"],
                 claims: claims,
                 expires: DateTime.Now.AddHours(8),
                 signingCredentials: credentials
 );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    [HttpPost("forgot-pin")]
    public async Task<IActionResult> ForgotPin(
        [FromBody] ForgotPinRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequest(new
            {
                IsSuccess = false,
                Message = "Το email είναι υποχρεωτικό."
            });
        }

        string normalizedEmail = request.Email.Trim().ToLower();

        var user = await _context.msc_Users
            .FirstOrDefaultAsync(x =>
                x.Email.ToLower() == normalizedEmail);

        if (user == null)
        {
            return NotFound(new
            {
                IsSuccess = false,
                Message = "Δεν βρέθηκε χρήστης με αυτό το email."
            });
        }

        var previousTokens = await _context.msc_PasswordResetTokens
            .Where(x =>
                x.UserId == user.Id &&
                !x.Used &&
                x.ExpireDate > DateTime.UtcNow)
            .ToListAsync();

        foreach (var previousToken in previousTokens)
        {
            previousToken.Used = true;
        }

        var resetToken = new msc_PasswordResetToken
        {
            UserId = user.Id,
            Token = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            ExpireDate = DateTime.UtcNow.AddMinutes(30),
            Used = false
        };

        _context.msc_PasswordResetTokens.Add(resetToken);

        await _context.SaveChangesAsync();

        string resetLink =
       $"https://localhost:51418/reset-pin?token={resetToken.Token}";

        try
        {
            await _emailService.SendResetPinEmailAsync(
                user.Email,
                user.Nickname ?? "",
                resetLink);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new
            {
                IsSuccess = false,
                Message = "Δημιουργήθηκε το αίτημα, αλλά απέτυχε η αποστολή του email.",
                Error = ex.Message
            });
        }

        return Ok(new
        {
            IsSuccess = true,
            Message = "Στάλθηκε σύνδεσμος επαναφοράς PIN στο email σου."
        });
    }
    [HttpPost("reset-pin")]
    public async Task<IActionResult> ResetPin(
    [FromBody] ResetPinRequest request)
    {
        if (request.Token == Guid.Empty)
        {
            return BadRequest(new
            {
                IsSuccess = false,
                Message = "Ο σύνδεσμος επαναφοράς δεν είναι έγκυρος."
            });
        }

        if (string.IsNullOrWhiteSpace(request.NewPin))
        {
            return BadRequest(new
            {
                IsSuccess = false,
                Message = "Το νέο PIN είναι υποχρεωτικό."
            });
        }

        if (request.NewPin != request.ConfirmPin)
        {
            return BadRequest(new
            {
                IsSuccess = false,
                Message = "Τα PIN δεν ταιριάζουν."
            });
        }

        if (request.NewPin.Length < 4)
        {
            return BadRequest(new
            {
                IsSuccess = false,
                Message = "Το PIN πρέπει να έχει τουλάχιστον 4 χαρακτήρες."
            });
        }

        var resetToken = await _context.msc_PasswordResetTokens
            .FirstOrDefaultAsync(x =>
                x.Token == request.Token &&
                !x.Used);

        if (resetToken == null)
        {
            return BadRequest(new
            {
                IsSuccess = false,
                Message = "Ο σύνδεσμος επαναφοράς δεν είναι έγκυρος ή έχει ήδη χρησιμοποιηθεί."
            });
        }

        if (resetToken.ExpireDate < DateTime.UtcNow)
        {
            return BadRequest(new
            {
                IsSuccess = false,
                Message = "Ο σύνδεσμος επαναφοράς έχει λήξει."
            });
        }

        var user = await _context.msc_Users
            .FirstOrDefaultAsync(x => x.Id == resetToken.UserId);

        if (user == null)
        {
            return NotFound(new
            {
                IsSuccess = false,
                Message = "Ο χρήστης δεν βρέθηκε."
            });
        }

        user.PasswordSha256 =
            CreateSha256(user.Email.Trim().ToLower() + request.NewPin);

        resetToken.Used = true;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            IsSuccess = true,
            Message = "Το PIN άλλαξε επιτυχώς."
        });
    }
}

