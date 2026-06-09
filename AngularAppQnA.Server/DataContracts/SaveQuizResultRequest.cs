public class SaveQuizResultRequest
{
    public int ThematologiaId { get; set; }

    public string UserEmail { get; set; } = "";
    public string Nickname { get; set; } = "";

    public int TotalQuestions { get; set; }

    public int CorrectAnswers { get; set; }

    public int WrongAnswers { get; set; }

    public int TotalTimeSeconds { get; set; }

    public string AnswersJson { get; set; } = "";
}