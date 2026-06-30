public class QuizAnswerJsonDto
{
    public int DetId { get; set; }
    public int QId { get; set; }
    public string Question { get; set; } = "";

    public int Difficulty { get; set; }

    public int? SelectedAId { get; set; }
    public string SelectedAnswer { get; set; } = "";

    public int? CorrectAId { get; set; }
    public string CorrectAnswer { get; set; } = "";

    public bool IsCorrect { get; set; }

    public int TimeSeconds { get; set; }
}