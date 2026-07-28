namespace AngularAppQnA.Server.Models
{
    public class msc_AuditLog
    {
        public int Id { get; set; }

        public string ActionType { get; set; } = "";

        public string? TableName { get; set; }

        public string? RecordId { get; set; }

        public string? Description { get; set; }

        public string? OldValues { get; set; }

        public string? NewValues { get; set; }

        public int? PerformedByUserId { get; set; }

        public string? PerformedByEmail { get; set; }

        public DateTime PerformedAt { get; set; } = DateTime.Now;
    }
}