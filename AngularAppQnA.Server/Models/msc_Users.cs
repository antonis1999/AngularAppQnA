using System.ComponentModel.DataAnnotations.Schema;

public class msc_Users
{
    public int Id { get; set; }

    public string Email { get; set; } = "";

    [Column("password_sha256")]
    public string? PasswordSha256 { get; set; } = "";

    public string? Nickname { get; set; } = "";

    [Column("store_id")]
    public int? StoreId { get; set; }

    [Column("role_id")]
    public int RoleId { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("is_active")]
    public bool IsActive { get; set; } = true;
}
