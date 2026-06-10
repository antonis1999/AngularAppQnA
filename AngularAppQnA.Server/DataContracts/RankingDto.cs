public class RankingDto
{
    public string Nickname { get; set; } = "";

    public int CorrectAnswers { get; set; }

    public int TotalQuestions { get; set; }

    public decimal Percentage { get; set; }

    public int TotalSeconds { get; set; }
    public DateTime CreateDate { get; set; }
}