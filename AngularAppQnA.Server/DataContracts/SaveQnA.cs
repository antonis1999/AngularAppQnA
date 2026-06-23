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
    }
    public class SaveQnAAnswer
    {
        public string Text { get; set; } = "";
        public bool IsCorrect { get; set; }
    }
}