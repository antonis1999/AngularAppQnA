namespace AngularAppQnA.Server.DataContracts
{
    public class ThematologiaRequest
    {
        public int Id {  get; set; }
        public string Title { get; set; }
        public DateTime FromDate { get; set; }
        public DateTime ToDate { get; set;  }

    }
}
