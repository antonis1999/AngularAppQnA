using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.Models;
using AngularAppQnA.Server.Services;
using AngularAppQnA.Server.Settings;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Http.Features;

internal class Program
{
    private static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        // Controllers και JSON ρυθμίσεις
        builder.Services
            .AddControllersWithViews()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
                options.JsonSerializerOptions.PropertyNamingPolicy = null;
            });

        // CORS για Angular client
        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAngularClient", policy =>
            {
                policy
                    .WithOrigins("http://localhost:51418")
                    .AllowAnyHeader()
                    .AllowAnyMethod();
            });
        });

        // Swagger
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen();

        // HttpContext
        builder.Services.AddHttpContextAccessor();

        // Database
        builder.Services.AddDbContext<AppDbContext>(options =>
        {
            options.UseSqlServer(
                builder.Configuration.GetConnectionString("DefaultConnection"));
        });

        // Settings
        builder.Services.Configure<AzureBlobStorageSettings>(
            builder.Configuration.GetSection("AzureBlobStorage"));

        builder.Services.Configure<EmailSettings>(
            builder.Configuration.GetSection("EmailSettings"));

        // Services
        builder.Services.AddScoped<AuditService>();
        builder.Services.AddScoped<BlobStorageService>();
        builder.Services.AddScoped<IEmailService, EmailService>();
        builder.Services.Configure<FormOptions>(options =>
        {
            options.MultipartBodyLengthLimit = 500 * 1024 * 1024;
        });

        // JWT Authentication
        string? jwtKey = builder.Configuration["Jwt:Key"];

        if (string.IsNullOrWhiteSpace(jwtKey))
        {
            throw new InvalidOperationException(
                "Δεν έχει οριστεί το Jwt:Key στο appsettings.json.");
        }

        builder.Services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters =
                    new TokenValidationParameters
                    {
                        ValidateIssuer = false,
                        ValidateAudience = false,
                        ValidateLifetime = true,
                        ValidateIssuerSigningKey = true,

                        IssuerSigningKey =
                            new SymmetricSecurityKey(
                                Encoding.UTF8.GetBytes(jwtKey))
                    };
            });

        builder.Services.AddAuthorization();

        var app = builder.Build();

        // Static Angular files
        app.UseDefaultFiles();
        app.UseStaticFiles();

        // Swagger μόνο σε development
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseHttpsRedirection();

        app.UseCors("AllowAngularClient");

        app.UseAuthentication();
        app.UseAuthorization();

        app.MapControllers();

        app.MapFallbackToFile("/index.html");

        app.Run();
    }
}