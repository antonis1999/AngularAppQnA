using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace AngularAppQnA.Server.Models
{
    [Table("Quiz_Results")]
    public class Quiz_Result
    {
        [Key]
        public int ResultId { get; set; }

        public int ThematologiaId { get; set; }

        public string UserEmail { get; set; } = "";
        public string Nickname { get; set; } = "";

        public int TotalQuestions { get; set; }

        public int CorrectAnswers { get; set; }

        public int WrongAnswers { get; set; }

        public int TotalTimeSeconds { get; set; }

        public string AnswersJson { get; set; } = "";

        public DateTime CreateDate { get; set; }
    }
}