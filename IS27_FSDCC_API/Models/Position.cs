using System.ComponentModel.DataAnnotations;

namespace IS27_FSDCC_API.Models
{
    public class Position
    {
        [Key]
        public int PositionNumber { get; set; }
        public string Title { get; set; }

        public int? EmployeeNumber { get; set; }
        public Employee? Employee { get; set; }

        public int? SupervisorPositionNumber { get; set; }

        public ICollection<Position> Subordinates { get; } = new List<Position>();

        public Position(int positionNumber, string title)
        {
            PositionNumber = positionNumber;
            Title = title;
        }
    }
}
