using System.ComponentModel.DataAnnotations;

namespace IS27_FSDCC_API.Models
{
    public class Employee
    {
        [Key]
        public int EmployeeNumber { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set;}

        public Employee(int employeeNumber, string firstName, string lastName)
        {
            EmployeeNumber = employeeNumber;
            FirstName = firstName;
            LastName = lastName;
        }
    }
}
