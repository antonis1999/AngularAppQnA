using AngularAppQnA.Server.Data;
using AngularAppQnA.Server.Models;
using System.Security.Claims;
using System.Text.Json;

namespace AngularAppQnA.Server.Services
{
    public class AuditService
    {
        private readonly AppDbContext _context;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AuditService(
            AppDbContext context,
            IHttpContextAccessor httpContextAccessor)
        {
            _context = context;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task LogAsync(
            string actionType,
            string? tableName = null,
            string? recordId = null,
            string? description = null,
            object? oldValues = null,
            object? newValues = null)
        {
            var user = _httpContextAccessor.HttpContext?.User;

            int? performedByUserId = null;

            string? userIdValue = user?
                .FindFirstValue(ClaimTypes.NameIdentifier);

            if (int.TryParse(userIdValue, out int userId))
            {
                performedByUserId = userId;
            }

            string performedByEmail =
                user?.FindFirstValue(ClaimTypes.Email)
                ?? "Unknown";

            var auditLog = new msc_AuditLog
            {
                ActionType = actionType,
                TableName = tableName,
                RecordId = recordId,
                Description = description,

                OldValues = oldValues == null
                    ? null
                    : JsonSerializer.Serialize(oldValues),

                NewValues = newValues == null
                    ? null
                    : JsonSerializer.Serialize(newValues),

                PerformedByUserId = performedByUserId,
                PerformedByEmail = performedByEmail,
                PerformedAt = DateTime.Now
            };

            _context.msc_AuditLog.Add(auditLog);

            await _context.SaveChangesAsync();
        }
    }
}