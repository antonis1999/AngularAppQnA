public class RankingDto
{
    public int RankingPosition { get; set; }

    public int ResultId { get; set; }

    public int ThematologiaId { get; set; }

    public string Nickname { get; set; }

    public int CorrectAnswers { get; set; }

    public int TotalQuestions { get; set; }

    public decimal Percentage { get; set; }

    public int TotalSeconds { get; set; }

    public DateTime CreateDate { get; set; }
    public decimal Points { get; set; }
    public int QuizDifficulty { get; set; }
}