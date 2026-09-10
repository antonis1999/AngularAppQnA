namespace AngularAppQnA.Server.DataContracts
{
    public class Thematologia_UpdateQuestionRequest
    {
        public int Id { get; set; }

        public int DetId { get; set; }

        public int QId { get; set; }

        public string Question { get; set; } = "";

        public int Difficulty { get; set; } = 1;

        public int QuestionType { get; set; } = 1;

        public List<Thematologia_UpdateAnswerRequest> Answers { get; set; } = new();

        public List<UpdateQuestionMediaRequest> Media { get; set; } = new();
    }

    public class Thematologia_UpdateAnswerRequest
    {
        public string Answer { get; set; } = "";
        public bool IsCorrect { get; set; }

        public string? MatchLeft { get; set; }
        public string? MatchRight { get; set; }

        public string? CategoryName { get; set; }
    }

    public class UpdateQuestionMediaRequest
    {
        public string MediaUrl { get; set; } = "";

        public string? BlobName { get; set; }

        public string MediaType { get; set; } = "";
    }
}