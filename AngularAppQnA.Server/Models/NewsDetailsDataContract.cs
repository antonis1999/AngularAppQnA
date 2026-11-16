
namespace AngularAppQnA.Server.Models
{
    public class NewsDetailsDataContract
    {
        public int Id { get; set; }
        public string? NewsHeader { get; set; }
        public string? NewsHeaderEn { get; set; }
        public string? NewsDetail { get; set; }
        public string? NewsDetailEn { get; set; }
        public string? PhotoData { get; set; }
        public string? PhotoName { get; set; }
        public string? PhotoData1 { get; set; }
        public string? PhotoData2 { get; set; }
        public string? Kategoryid { get; set; }
        public string? insertDate { get; set; }
        public string? NewsType { get; set; }
        public string? VideoLink { get; set; }
        public string? HealthId { get; set; }
        public string? IfLinkFromOtherSite { get; set; }
        public string? UserName { get; set; }
        public bool? IsEnabled { get; set; }
        public string? Vacancies_City { get; set; }
        public NewsDetailsDataContractDet[]? NewsDetailsDataContractDet { get; set; }
    }

    public class NewsDetailsDataContractDet
    {
        public int DetId { get; set; }
        public string DetImage { get; set; } = string.Empty;
    }
}
