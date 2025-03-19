import React, { useEffect, useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Card, Col, Row, Container, Dropdown } from "react-bootstrap";
import CourseListAccordion from "../components/CourseListAccordion";
import { groupPrerequisites } from "../utils/groupPrerequisites";
import "../css/CourseListPage.css";
import { motion } from "framer-motion";
import * as Sentry from "@sentry/react";
import { CourseListPageError } from "../../middleware/SentryErrors";

function CourseListPage() {
	const [isDesktop, setIsDesktop] = useState(window.innerWidth > 767);
	const [showPopup, setShowPopup] = useState(false);
	const [selectedDegree, setSelectedDegree] = useState("Select Degree");
	const [selectedCourse, setSelectedCourse] = useState(null);
	const [courseList, setCourseList] = useState([]);
	const [degrees, setDegrees] = useState([]);

	const fetchController = useRef(null);

	useEffect(() => {
		const handleResize = () => setIsDesktop(window.innerWidth > 767);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		const getDegrees = async () => {
			try {
				const response = await fetch(
					`${process.env.REACT_APP_SERVER}/degree/getAllDegrees`,
					{
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
					}
				);
				const jsonData = await response.json();
				setDegrees(jsonData.degrees);
			} catch (err) {
				Sentry.captureException(err);
				console.error(err.message);
			}
		};
		getDegrees();
	}, []);

	useEffect(() => {
		if (!isDesktop && selectedCourse) {
			setShowPopup(true);
		}
	}, [isDesktop, selectedCourse]);

	// Fetch courses for a specific degree (grouped by pool)
	const fetchCourses = async (degreeObj) => {
		if (fetchController.current) {
			fetchController.current.abort();
		}
		const controller = new AbortController();
		fetchController.current = controller;

		setCourseList([]);
		const degree = degreeObj.id;
		try {
			console.log("Fetching courses by degree:", degree);
			const response = await fetch(
				`${process.env.REACT_APP_SERVER}/courses/getByDegreeGrouped`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ degree }),
					signal: controller.signal,
				}
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new CourseListPageError(
					errorData.error || `HTTP error! status: ${response.status}`
				);
			}
			const data = await response.json();
			setCourseList(data);
			console.log(data);
		} catch (err) {
			console.log("Error fetching courses:", err);
		}
	};

	// Fetch all courses from /courses/getallcourses and wrap in a single group
	const fetchAllCourses = async () => {
		if (fetchController.current) {
			fetchController.current.abort();
		}
		const controller = new AbortController();
		fetchController.current = controller;

		setCourseList([]);
		try {
			console.log("Fetching all courses");
			const response = await fetch(
				`${process.env.REACT_APP_SERVER}/courses/getallcourses`,
				{
					method: "POST", // Adjust method if necessary
					headers: {
						"Content-Type": "application/json",
					},
					signal: controller.signal,
				}
			);
			if (!response.ok) {
				const errorData = await response.json();
				throw new CourseListPageError(
					errorData.error || `HTTP error! status: ${response.status}`
				);
			}
			const data = await response.json();
			// Wrap the array in a group-like structure so CourseListAccordion can render it
			const groupedData = [
				{
					poolId: "all",
					poolName: "All Courses",
					courses: data,
				},
			];
			setCourseList(groupedData);
			console.log(groupedData);
		} catch (err) {
			console.log("Error fetching all courses:", err);
		}
	};

	// Handle selection from dropdown: either a degree or the "All Courses" option
	const handleSelectDegree = (degree) => {
		setSelectedDegree(degree.name);
		fetchCourses(degree);
	};

	// Handle selecting "All Courses"
	const handleSelectAllCourses = () => {
		setSelectedDegree("All Courses");
		fetchAllCourses();
	};

	function hidePopup() {
		setShowPopup(false);
		setSelectedCourse(null);
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			transition={{ duration: 0.5 }}
		>
			<Container fluid>
				<div className="course-list-div">
					<h3>Select Degree</h3>
					<Dropdown>
						<Dropdown.Toggle
							id="dropdown-basic"
							data-testid="degree-dropdown"
							className="course-list-dropdown-toggle"
						>
							{selectedDegree}
						</Dropdown.Toggle>
						<Dropdown.Menu>
							{/* Option for All Courses */}
							<Dropdown.Item onClick={handleSelectAllCourses}>
								All Courses
							</Dropdown.Item>
							{/* List individual degrees */}
							{degrees.length === 0 ? (
								<Dropdown.Item disabled>Loading...</Dropdown.Item>
							) : (
								degrees.map((degree, index) => (
									<Dropdown.Item
										key={index}
										onClick={() => handleSelectDegree(degree)}
									>
										{degree.name}
									</Dropdown.Item>
								))
							)}
						</Dropdown.Menu>
					</Dropdown>
				</div>

				<Row style={{ display: "flex" }}>
					<Col
						sm={12}
						md={7}
					>
						{/* Only display course accordions if the courseList has data */}
						{courseList.length !== 0 && (
							<CourseListAccordion
								courseList={courseList}
								selectedCourse={selectedCourse}
								setSelectedCourse={setSelectedCourse}
							/>
						)}
					</Col>
					{isDesktop && selectedCourse && (
						<Col md={5}>
							<Card className="course-display-card">
								<Card.Body>
									<Card.Title>
										<b>{selectedCourse.title}</b>
									</Card.Title>
									<Card.Text>
										<br />
										<b>Credits:</b> {selectedCourse.credits}
									</Card.Text>
									<Card.Text>
										<p>
											<b>Prerequisites/Corequisites:</b>
										</p>
										{selectedCourse.requisites &&
										selectedCourse.requisites.length > 0 ? (
											<ul>
												{groupPrerequisites(selectedCourse.requisites).map(
													(group, index) => (
														<li key={index}>
															{group.type.toLowerCase() === "pre"
																? "Prerequisite: "
																: "Corequisite: "}
															{group.codes.join(" or ")}
														</li>
													)
												)}
											</ul>
										) : (
											<p>None</p>
										)}
									</Card.Text>
									<Card.Text>
										<b>Description:</b> {selectedCourse.description}
									</Card.Text>
									{selectedCourse.components && (
										<Card.Text>
											<b>Components:</b> {selectedCourse.components}
										</Card.Text>
									)}
									{selectedCourse.notes && (
										<Card.Text>
											<b>Notes:</b> {selectedCourse.notes}
										</Card.Text>
									)}
								</Card.Body>
							</Card>
						</Col>
					)}
					{/* Display a popup for screens narrower than 767px */}
					{!isDesktop && (
						<Modal
							show={showPopup}
							onHide={hidePopup}
						>
							<Modal.Header closeButton>
								<Modal.Title>{selectedCourse?.title}</Modal.Title>
							</Modal.Header>
							<Modal.Body>
								{selectedCourse ? (
									<>
										<p>
											<b>Credits:</b> {selectedCourse.credits}
										</p>
										<p>
											<b>Prerequisites:</b>{" "}
											{selectedCourse.requisites || "None"}
										</p>
										<p>
											<b>Corequisites:</b>{" "}
											{selectedCourse.corequisites || "None"}
										</p>
										<p>
											<b>Description:</b> {selectedCourse.description}
										</p>
										<p>
											<b>Notes:</b> {selectedCourse.notes}
										</p>
									</>
								) : (
									<p>No course selected.</p>
								)}
							</Modal.Body>
							<Modal.Footer>
								<button
									onClick={hidePopup}
									className="btn btn-secondary"
								>
									Close
								</button>
							</Modal.Footer>
						</Modal>
					)}
				</Row>
			</Container>
		</motion.div>
	);
}

export default CourseListPage;
