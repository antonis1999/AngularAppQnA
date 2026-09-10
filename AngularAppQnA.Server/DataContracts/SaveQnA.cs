namespace AngularAppQnA.Server.DataContracts
{
    public class SaveQnA
    {
        public int ThematologiaId { get; set; }

        public int TheoriaDetId { get; set; }

        public List<SaveQnAQuestion> Questions { get; set; } = new();
    }

    public class SaveQnAQuestion
    {
        public string QuestionText { get; set; } = "";

        public List<SaveQnAAnswer> Answers { get; set; } = new();

        public int Difficulty { get; set; } = 1;
        public int QuestionType { get; set; } = 1;
        public List<SaveQnAMedia> Media { get; set; } = new();
    }

    public class SaveQnAAnswer
    {
        public string Text { get; set; } = "";
        public bool IsCorrect { get; set; }

        public string? MatchLeft { get; set; }
        public string? MatchRight { get; set; }

        public string? CategoryName { get; set; }
    }
    public class SaveQnAMedia
    {
        public string MediaUrl { get; set; } = "";

        public string? BlobName { get; set; }

        public string MediaType { get; set; } = "";
    }
}