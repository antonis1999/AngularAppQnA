using Ganss.Excel;

namespace AngularAppQnA.Server.DataContracts
{
    public class QuizImportRow
    {
        [Column("ΘΕΩΡΙΑ")]
        public string Theory { get; set; } = "";

        [Column("ΛΕΠΤΟΜΕΡΕΙΕΣ ΘΕΩΡΙΑΣ")]
        public string TheoryDetails { get; set; } = "";

        [Column("ΕΡΩΤΗΣΗ")]
        public string Question { get; set; } = "";

        [Column("ΑΠΑΝΤΗΣΕΙΣ (Διαχωρισμός με ;)")]
        public string Answers { get; set; } = "";

        [Column("ΣΩΣΤΗ ΑΠΑΝΤΗΣΗ(Δήλωση με αριθμό)")]
        public int CorrectAnswer { get; set; }
    }
}