public class UpdateQuizSettingsRequest
{
    public int ThematologiaId { get; set; }

    public int QuizQuestionCount { get; set; }

    public bool UseQuizDifficulty { get; set; }

    public int QuizDifficultyPercent { get; set; }
}