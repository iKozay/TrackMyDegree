import Database from "@controllers/DBController/DBController";
import DegreeTypes from "@controllers/degreeController/degree_types";
import { captureException } from "@sentry/react";

/**
 * Creates a new degree in the database.
 *
 * @param {string} id - The unique identifier for the degree.
 * @param {string} name - The name of the degree.
 * @param {number} totalCredits - The total number of credits required to complete the degree.
 * @returns {Promise<DegreeTypes.Degree | undefined>} - The created degree object or undefined if the operation fails.
 */
async function createDegree(
	id: string,
	name: string,
	totalCredits: number
): Promise<DegreeTypes.Degree | undefined> {
	const conn = await Database.getConnection();

	if (conn) {
		try {
			// Check if a degree with the same id or name already exists
			const existingDegree = await conn
				.request()
				.input("id", Database.msSQL.VarChar, id)
				.input("name", Database.msSQL.VarChar, name)
				.query("SELECT * FROM Degree WHERE id = @id OR name = @name");

			if (existingDegree.recordset.length > 0) {
				throw new Error("Degree with this id or name already exists.");
			}

			await conn
				.request()
				.input("id", Database.msSQL.VarChar, id)
				.input("name", Database.msSQL.VarChar, name)
				.input("totalCredits", Database.msSQL.Int, totalCredits)
				.query(
					"INSERT INTO Degree (id, name, totalCredits) VALUES (@id, @name, @totalCredits)"
				);

			return { id, name, totalCredits };
		} catch (error) {
			captureException(error);
			throw error;
		} finally {
			conn.close();
		}
	}
}

/**
 * Retrieves a degree by its ID.
 *
 * @param {string} id - The unique identifier for the degree.
 * @returns {Promise<DegreeTypes.Degree | undefined>} - The degree object or undefined if the degree is not found.
 */
async function readDegree(id: string): Promise<DegreeTypes.Degree | undefined> {
	const conn = await Database.getConnection();

	if (conn) {
		try {
			// Check if a degree with the id exists
			const degree = await conn
				.request()
				.input("id", Database.msSQL.VarChar, id)
				.query("SELECT * FROM Degree WHERE id = @id");

			if (degree.recordset.length === 0) {
				throw new Error("Degree with this id does not exist.");
			}

			return degree.recordset[0];
		} catch (error) {
			captureException(error);
			throw error;
		} finally {
			conn.close();
		}
	}
}
/**
 * Retrieves all degrees from the database.
 *
 * @returns {Promise<DegreeTypes.Degree[] | undefined>} - A list of all degrees or undefined if no degrees are found.
 */
async function readAllDegrees(): Promise<DegreeTypes.Degree[] | undefined> {
	const conn = await Database.getConnection();

	if (conn) {
		try {
			const degrees = await conn
				.request()
				.query("SELECT * FROM Degree WHERE id LIKE 'D%'");

			return degrees.recordset;
		} catch (error) {
			captureException(error);
			throw error;
		} finally {
			conn.close();
		}
	}
}

/**
 * Updates an existing degree with new information.
 *
 * @param {string} id - The unique identifier for the degree.
 * @param {string} name - The new name of the degree.
 * @param {number} totalCredits - The new total credits for the degree.
 * @returns {Promise<DegreeTypes.Degree | undefined>} - The updated degree object or undefined if the update fails.
 */
async function updateDegree(
	id: string,
	name: string,
	totalCredits: number
): Promise<DegreeTypes.Degree | undefined> {
	const conn = await Database.getConnection();

	if (conn) {
		try {
			// Check if a degree with the id exists
			const degree = await conn
				.request()
				.input("id", Database.msSQL.VarChar, id)
				.query("SELECT * FROM Degree WHERE id = @id");

			if (degree.recordset.length === 0) {
				throw new Error("Degree with this id does not exist.");
			}

			// Update the degree with the new name and totalCredits
			await conn
				.request()
				.input("id", Database.msSQL.VarChar, id)
				.input("fullname", Database.msSQL.VarChar, name)
				.input("totalCredits", Database.msSQL.Int, totalCredits)
				.query(
					"UPDATE Degree SET name = @fullname, totalCredits = @totalCredits WHERE id = @id"
				);

			// Return the updated degree
			const updatedDegree = await conn
				.request()
				.input("id", Database.msSQL.VarChar, id)
				.query("SELECT * FROM Degree WHERE id = @id");

			return updatedDegree.recordset[0];
		} catch (error) {
			captureException(error);
			throw error;
		} finally {
			conn.close();
		}
	}
}
/**
 * Deletes a degree from the database by its ID.
 *
 * @param {string} id - The unique identifier for the degree to delete.
 * @returns {Promise<string | undefined>} - A success message if the degree is deleted or undefined if the deletion fails.
 */
async function deleteDegree(id: string): Promise<string | undefined> {
	const conn = await Database.getConnection();

	if (conn) {
		try {
			// Check if a degree with the given id exists
			const degree = await conn
				.request()
				.input("id", Database.msSQL.VarChar, id)
				.query("SELECT * FROM Degree WHERE id = @id");

			if (degree.recordset.length === 0) {
				throw new Error("Degree with this id does not exist.");
			}

			// Delete the degree
			await conn
				.request()
				.input("id", Database.msSQL.VarChar, id)
				.query("DELETE FROM Degree WHERE id = @id");

			// Return success message
			return `Degree with id ${id} has been successfully deleted.`;
		} catch (error) {
			captureException(error);
			throw error;
		} finally {
			conn.close();
		}
	}
}

//Namespace
const degreeController = {
	createDegree,
	readDegree,
	updateDegree,
	deleteDegree,
	readAllDegrees,
};

export default degreeController;
