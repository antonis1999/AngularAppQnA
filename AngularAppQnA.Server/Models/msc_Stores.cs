namespace AngularAppQnA.Server.Models
{
    public class msc_Stores
    {
        public int Id { get; set; }
        public string StoreName { get; set; } = "";
        public string? StoreCode { get; set; }
        public bool IsActive { get; set; }
    }
}