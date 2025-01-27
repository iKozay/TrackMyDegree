export const groupPrerequisites = (requisites) => {
    const grouped = {};
  
    requisites.forEach((prereq) => {
      const { type, group_id } = prereq;
      // Create a unique key based on type and group_id
      const key = group_id ? `${type}-${group_id}` : `${type}-${prereq.code1}`;
        console.log(key);
        console.log(type);
        console.log(prereq.code1);
        console.log(prereq.code2);
        console.log(group_id);
      if (!grouped[key]) {
        grouped[key] = {
          type,
          codes: [],
        };
      }
  
      grouped[key].codes.push(prereq.code2);
    });
  
    // Convert the grouped object into an array
    return Object.values(grouped);
  };