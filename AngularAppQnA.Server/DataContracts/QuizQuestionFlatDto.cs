public class QuizQuestionFlatDto
{
    public int Id { get; set; }

    public int DetId { get; set; }

    public int QId { get; set; }

    public string Question { get; set; } = string.Empty;

    public int? Difficulty { get; set; }

    public string? Details { get; set; }

    public int AId { get; set; }

    public string Answer { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }
}