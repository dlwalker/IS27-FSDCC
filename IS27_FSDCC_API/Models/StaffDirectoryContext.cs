using Microsoft.EntityFrameworkCore;
using IS27_FSDCC_API.Models;

namespace IS27_FSDCC_API.Models
{
    public class StaffDirectoryContext : DbContext
    {
        public StaffDirectoryContext(DbContextOptions<StaffDirectoryContext> options) : base(options)
        {
        }

        public DbSet<Position> Positions { get; set; } = null!;

        public DbSet<Employee> Employees { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<Position>()
                .HasMany(e => e.Subordinates)
                .WithOne()
                .HasForeignKey(e => e.SupervisorPositionNumber)
                .IsRequired(false);

            modelBuilder.Entity<Position>()
                .HasOne(e => e.Employee)
                .WithMany()
                .HasForeignKey(e => e.EmployeeNumber)
                .IsRequired(false);

            //seed data for in-memory database context
            modelBuilder.Entity<Employee>().HasData(
                new Employee(1, "Daniel", "Walker"),
                new Employee(2, "Aude", "Tunde"),
                new Employee(3, "Pittiulaaq", "Modestus"),
                new Employee(4, "Ahmose", "Shelia"),
                new Employee(5, "Bernard", "Carmela"),
                new Employee(6, "Bill", "Hyakinthos"),
                new Employee(7, "Annikki", "Laverna"),
                new Employee(8, "Lavanya", "Nakisha"),
                new Employee(9, "Catherina", "Kaycee"),
                new Employee(10, "Laura", "Heilyn")
            );

            modelBuilder.Entity<Position>().HasData(
                new { PositionNumber = 1, Title = "Director", EmployeeNumber = 1 },
                new { PositionNumber = 2, Title = "Senior Manager 1", SupervisorPositionNumber = 1, EmployeeNumber = 6},
                new Position(3, "Senior Mangager 2") { SupervisorPositionNumber = 1},
                new Position(4, "Manager 1") { SupervisorPositionNumber = 2},
                new Position(5, "Senior Developer") { SupervisorPositionNumber = 4},
                new Position(6, "Junior Developer") { SupervisorPositionNumber = 5}
            );

        }

    }
}
